import { Input, Modal } from "antd";
import type { InputRef } from "antd";
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
  ForwardRefRenderFunction,
} from "react";

export interface PopUpSearchRef {
  open: () => void;
}

const PopUpSearch: ForwardRefRenderFunction<PopUpSearchRef> = (_, ref) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");

  const inputRef = useRef<InputRef>(null);

  useImperativeHandle(ref, () => ({
    open: () => {
      setSearchValue("");
      setVisible(true);
    },
  }));

  useEffect(() => {
    if (visible) {
      setLoading(true);

      setTimeout(() => {
        setLoading(false);
      }, 500);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [visible]);

  return (
    <Modal
      centered
      open={visible}
      onCancel={() => setVisible(false)}
      footer={null}
      loading={loading}
      width={{
        xs: "80%",
        sm: "70%",
        md: "60%",
        lg: "50%",
        xl: "40%",
        xxl: "30%",
      }}
      title={
        <Input
          className="font-normal"
          ref={inputRef}
          placeholder="Tìm kiếm..."
          variant="borderless"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
      }
    >
      <div className="mt-4">
        <p>Tên đoạn chat...</p>
        <p>Tên đoạn chat...</p>
        <p>Tên đoạn chat...</p>
      </div>
    </Modal>
  );
};

export default forwardRef(PopUpSearch);
